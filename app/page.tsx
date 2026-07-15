"use client";

import { useState } from "react";
import type { GenerateResult, QAPair, Stage } from "@/lib/types";

type ResultTab = "prompt" | "prd" | "tasks";

export default function Home() {
  const [stage, setStage] = useState<Stage>("dump");
  const [brainDump, setBrainDump] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [tab, setTab] = useState<ResultTab>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setStage("dump");
    setBrainDump("");
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setTab("prompt");
    setError(null);
    setCopied(false);
  }

  async function fetchQuestions() {
    if (brainDump.trim().length < 10) {
      setError("Ceritakan idemu dulu, minimal beberapa kalimat.");
      return;
    }
    setError(null);
    setStage("loading");
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brainDump }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil pertanyaan.");
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
      setStage("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setStage("dump");
    }
  }

  async function generate() {
    setError(null);
    setStage("loading");
    try {
      const qa: QAPair[] = questions.map((question, i) => ({
        question,
        answer: answers[i] ?? "",
      }));
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brainDump, qa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal generate.");
      setResult(data as GenerateResult);
      setTab("prompt");
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setStage("questions");
    }
  }

  async function copyPrompt() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.megaPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Gagal menyalin ke clipboard.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:px-8">
      <Header showReset={stage !== "dump"} onReset={reset} />

      {error && (
        <div className="mb-6 border border-accent-dim bg-panel px-4 py-3 font-mono text-sm text-accent">
          {error}
        </div>
      )}

      {stage === "dump" && (
        <DumpStage
          value={brainDump}
          onChange={setBrainDump}
          onNext={fetchQuestions}
        />
      )}

      {stage === "loading" && <LoadingStage />}

      {stage === "questions" && (
        <QuestionsStage
          questions={questions}
          answers={answers}
          onAnswer={(i, v) =>
            setAnswers((prev) => {
              const next = [...prev];
              next[i] = v;
              return next;
            })
          }
          onGenerate={generate}
        />
      )}

      {stage === "result" && result && (
        <ResultStage
          result={result}
          tab={tab}
          setTab={setTab}
          onCopy={copyPrompt}
          copied={copied}
        />
      )}

      <footer className="mt-auto pt-12">
        <p className="font-mono text-xs text-muted">
          ACE PRD — kecepatan di atas kelengkapan.
        </p>
      </footer>
    </main>
  );
}

/* ---------- Header ---------- */

function Header({
  showReset,
  onReset,
}: {
  showReset: boolean;
  onReset: () => void;
}) {
  return (
    <header className="mb-10 flex items-start justify-between border-b border-line pb-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          ace prd
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-paper sm:text-3xl">
          Dari ide mentah ke mega-prompt.
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Brain dump &rarr; 4 pertanyaan &rarr; PRD ringkas + task + prompt siap
          tempel.
        </p>
      </div>
      {showReset && (
        <button
          onClick={onReset}
          className="shrink-0 border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          mulai ulang
        </button>
      )}
    </header>
  );
}

/* ---------- Stage: dump ---------- */

function DumpStage({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <section>
      <Eyebrow>01 · brain dump</Eyebrow>
      <textarea
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cerita bebas: buat siapa ini, masalah apa yang mau kamu pecahkan, kenapa kepikiran sekarang? Tulis mentah aja, gak usah rapi."
        className="w-full resize-y border border-line bg-panel px-4 py-3 text-sm leading-relaxed text-paper placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          {value.trim().length} karakter
        </span>
        <button
          onClick={onNext}
          className="border border-accent bg-accent px-5 py-2 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          Lanjut &rarr;
        </button>
      </div>
    </section>
  );
}

/* ---------- Stage: loading ---------- */

function LoadingStage() {
  return (
    <section className="flex flex-col items-center justify-center py-24">
      <div className="flex items-center gap-2 font-mono text-sm text-muted">
        <span>lagi mikir</span>
        <span className="dot-blink text-accent" style={{ animationDelay: "0s" }}>
          .
        </span>
        <span
          className="dot-blink text-accent"
          style={{ animationDelay: "0.2s" }}
        >
          .
        </span>
        <span
          className="dot-blink text-accent"
          style={{ animationDelay: "0.4s" }}
        >
          .
        </span>
      </div>
    </section>
  );
}

/* ---------- Stage: questions ---------- */

function QuestionsStage({
  questions,
  answers,
  onAnswer,
  onGenerate,
}: {
  questions: string[];
  answers: string[];
  onAnswer: (i: number, v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <section>
      <Eyebrow>02 · 4 pertanyaan kritis</Eyebrow>
      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={i} className="border border-line bg-panel p-4">
            <div className="flex gap-3">
              <span className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm leading-relaxed text-paper">{q}</p>
            </div>
            <input
              value={answers[i] ?? ""}
              onChange={(e) => onAnswer(i, e.target.value)}
              placeholder="jawab singkat, 1-2 kalimat"
              className="mt-3 w-full border border-line bg-panel-raised px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onGenerate}
          className="border border-accent bg-accent px-5 py-2 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          Generate PRD + Prompt &rarr;
        </button>
      </div>
    </section>
  );
}

/* ---------- Stage: result ---------- */

function ResultStage({
  result,
  tab,
  setTab,
  onCopy,
  copied,
}: {
  result: GenerateResult;
  tab: ResultTab;
  setTab: (t: ResultTab) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <section>
      <Eyebrow>03 · hasil</Eyebrow>

      <div className="mb-5 flex border border-line">
        <TabButton active={tab === "prompt"} onClick={() => setTab("prompt")}>
          Mega-Prompt
        </TabButton>
        <TabButton active={tab === "prd"} onClick={() => setTab("prd")}>
          PRD
        </TabButton>
        <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")}>
          Tasks
        </TabButton>
      </div>

      {tab === "prompt" && (
        <div className="border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">
              siap tempel ke AI coding agent
            </span>
            <button
              onClick={onCopy}
              className="border border-line px-3 py-1 font-mono text-xs text-paper transition-colors hover:border-accent hover:text-accent"
            >
              {copied ? "tersalin ✓" : "Copy"}
            </button>
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-paper">
            {result.megaPrompt}
          </pre>
        </div>
      )}

      {tab === "prd" && <PrdView result={result} />}

      {tab === "tasks" && <TasksView result={result} />}
    </section>
  );
}

function PrdView({ result }: { result: GenerateResult }) {
  const { prd } = result;
  return (
    <div className="flex flex-col gap-px bg-line">
      <Field label="Problem statement">
        <p className="text-sm leading-relaxed text-paper">
          {prd.problemStatement}
        </p>
      </Field>
      <Field label="Target user">
        <p className="text-sm leading-relaxed text-paper">{prd.targetUser}</p>
      </Field>
      <Field label="Core features">
        <BulletList items={prd.coreFeatures} />
      </Field>
      <Field label="Nice to have">
        <BulletList items={prd.niceToHave} />
      </Field>
      <Field label="Constraints">
        <p className="text-sm leading-relaxed text-paper">{prd.constraints}</p>
      </Field>
      <Field label="Success criteria">
        <p className="text-sm leading-relaxed text-paper">
          {prd.successCriteria}
        </p>
      </Field>
    </div>
  );
}

function TasksView({ result }: { result: GenerateResult }) {
  return (
    <div className="flex flex-col gap-4">
      {result.tasks.map((epic, i) => (
        <div key={i} className="border border-line bg-panel p-4">
          <div className="mb-3 flex items-center gap-3 border-b border-line pb-2">
            <span className="font-mono text-xs text-accent">
              E{String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="font-mono text-sm uppercase tracking-wider text-paper">
              {epic.epic}
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {epic.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-sm text-paper">
                <span className="mt-0.5 font-mono text-xs text-muted">[ ]</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------- Small building blocks ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
      {children}
    </p>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 border-r border-line px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors last:border-r-0 ${
        active
          ? "bg-accent text-ink"
          : "bg-panel text-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-panel p-4">
      <p className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">
        {label}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm italic text-muted">&mdash;</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-paper">
          <span className="mt-0.5 font-mono text-xs text-accent">&rsaquo;</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}
