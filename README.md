# ACE PRD

Tool personal untuk mengatasi "kertas kosong" saat mau mulai project baru.

**Alur:** brain dump ide mentah → AI ajukan 4 pertanyaan kritis → AI generate PRD ringkas + task breakdown + satu **mega-prompt** siap tempel ke AI coding agent (Claude Code / Cursor) untuk one-shot scaffold project berikutnya.

Prinsip desain: **kecepatan di atas kelengkapan.** Tulis brain dump → jawab 4 pertanyaan singkat → langsung dapat output siap pakai. Tanpa step tambahan, tanpa friksi.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v4 (`@theme inline` token system)
- Google Generative AI SDK (`@google/generative-ai`), model `gemini-2.5-flash`
- Tanpa database (state di client, single page)
- Font: system font stack (tidak ada fetch font eksternal saat build)

## Setup lokal

```bash
npm install
cp .env.local.example .env.local   # lalu isi GEMINI_API_KEY
npm run dev
```

Ambil `GEMINI_API_KEY` gratis di https://aistudio.google.com/apikey

## Build

```bash
npm run build
```

Build tidak butuh akses internet (tanpa `next/font/google`).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import repo di [Vercel](https://vercel.com/new).
3. Tambahkan Environment Variable `GEMINI_API_KEY` di dashboard Vercel.
4. Deploy. Framework preset otomatis terdeteksi sebagai Next.js.

## Struktur

```
prd-forge/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # single-page client, semua UI
│   ├── globals.css           # design tokens (Tailwind v4)
│   └── api/
│       ├── questions/route.ts   # POST: brain dump → 4 pertanyaan
│       └── generate/route.ts    # POST: dump + jawaban → PRD + tasks + megaPrompt
├── lib/
│   ├── prompts.ts            # QUESTIONS_SYSTEM_PROMPT & GENERATE_SYSTEM_PROMPT
│   ├── gemini.ts             # callGemini() + parseJsonResponse() defensif
│   └── types.ts              # tipe bersama
├── .env.local.example
└── README.md
```

## API

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/questions` | `{ brainDump: string }` | `{ questions: string[] }` |
| `POST /api/generate` | `{ brainDump: string, qa: {question,answer}[] }` | `{ prd, tasks, megaPrompt }` |

## Catatan pengembangan

Versi awal ini single-session — hasil generate tidak disimpan. Kalau nanti perlu history (buka project lama), tambahkan Supabase: table `prds` (`id uuid`, `brain_dump text`, `qa jsonb`, `result jsonb`, `created_at timestamptz`). Belum dibangun agar tetap ramping.
