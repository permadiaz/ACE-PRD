# ACE PRD

Tool personal untuk mengatasi "kertas kosong" saat mau mulai project baru.

**Alur:** brain dump ide mentah → AI ajukan 4 pertanyaan kritis → AI generate PRD ringkas + task breakdown + satu **mega-prompt** siap tempel ke AI coding agent (Claude Code / Cursor) untuk one-shot scaffold project berikutnya.

Prinsip desain: **kecepatan di atas kelengkapan.** Tulis brain dump → jawab 4 pertanyaan singkat → langsung dapat output siap pakai. Tanpa step tambahan, tanpa friksi.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v4 (`@theme inline` token system)
- Google Gen AI SDK (`@google/genai`), model `gemini-3.5-flash`, structured output (`responseSchema`)
- Supabase (opsional) — simpan history PRD; app tetap jalan tanpa ini
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
│   ├── supabase.ts           # client Supabase (graceful null kalau env kosong)
│   └── types.ts              # tipe bersama
├── supabase/
│   └── schema.sql            # tabel prds + RLS (tempel ke Supabase SQL Editor)
├── .env.local.example
└── README.md
```

## API

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/questions` | `{ brainDump: string }` | `{ questions: string[] }` |
| `POST /api/generate` | `{ brainDump: string, qa: {question,answer}[] }` | `{ prd, tasks, megaPrompt }` |

## Supabase (history PRD)

Fitur riwayat menyimpan setiap hasil generate supaya bisa dibuka lagi. **Opsional** — kalau env Supabase tidak diisi, app tetap berfungsi penuh, cuma tanpa riwayat.

Setup:

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → tempel isi [`supabase/schema.sql`](./supabase/schema.sql) → **Run**. Ini bikin tabel `prds` + mengaktifkan Row Level Security (RLS).
3. Buka **Settings → API**, salin **Project URL** dan **anon public** key.
4. Isi di `.env.local` (lokal) dan di Environment Variables Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Skema `prds`: `id uuid`, `user_id uuid` (nullable, disiapkan untuk auth nanti), `brain_dump text`, `qa jsonb`, `result jsonb`, `created_at timestamptz`.

> **Fase personal vs publik:** `schema.sql` sekarang memakai policy yang mengizinkan `anon` penuh supaya langsung bisa dipakai sendiri tanpa login. Saat kamu menambah login + pembayaran nanti, ganti policy itu dengan versi per-user (`auth.uid() = user_id`) — blok SQL-nya sudah disiapkan (dikomentari) di bawah file yang sama.

## Catatan pengembangan

- **Rencana bertahap:** fase sekarang dipakai sendiri (tanpa auth). Setelah puas, tambah layer login + gate pembayaran. Kolom `user_id` sudah disiapkan sejak awal supaya transisi itu mulus tanpa migrasi data.
