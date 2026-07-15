-- ACE PRD — skema Supabase
-- Cara pakai: buka Supabase Dashboard project kamu -> SQL Editor -> tempel
-- seluruh isi file ini -> Run. Aman dijalankan ulang (idempotent).

-- gen_random_uuid() butuh pgcrypto (biasanya sudah aktif di Supabase).
create extension if not exists "pgcrypto";

create table if not exists public.prds (
  id          uuid primary key default gen_random_uuid(),
  -- Dibiarkan NULL selama fase personal. Saat auth ditambahkan nanti,
  -- kolom ini diisi auth.uid() tanpa perlu migrasi data lama.
  user_id     uuid,
  brain_dump  text not null,
  qa          jsonb not null default '[]'::jsonb,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists prds_created_at_idx on public.prds (created_at desc);
create index if not exists prds_user_id_idx on public.prds (user_id);

-- Row Level Security WAJIB aktif meski sekarang cuma dipakai sendiri.
alter table public.prds enable row level security;

-- =====================================================================
-- FASE PERSONAL (sekarang): izinkan anon penuh.
-- Ini membuat tool langsung jalan tanpa login. Karena URL app kamu
-- belum publik, risikonya kecil — tapi tetap sadar bahwa siapa pun yang
-- tahu anon key + URL bisa baca/tulis tabel ini.
-- =====================================================================
drop policy if exists "personal_phase_anon_all" on public.prds;
create policy "personal_phase_anon_all"
  on public.prds
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =====================================================================
-- FASE PUBLIK (nanti, saat menambah login): HAPUS policy di atas dan
-- ganti dengan yang di bawah agar tiap user hanya melihat datanya sendiri.
-- Jalankan blok ini HANYA setelah auth aktif dan kolom user_id diisi.
-- =====================================================================
-- drop policy if exists "personal_phase_anon_all" on public.prds;
-- create policy "prds_owner_select" on public.prds
--   for select to authenticated using (auth.uid() = user_id);
-- create policy "prds_owner_insert" on public.prds
--   for insert to authenticated with check (auth.uid() = user_id);
-- create policy "prds_owner_update" on public.prds
--   for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy "prds_owner_delete" on public.prds
--   for delete to authenticated using (auth.uid() = user_id);
