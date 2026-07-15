import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Client Supabase untuk browser, memakai anon key (aman di client SELAMA RLS aktif).
 *
 * Sengaja "graceful": kalau env belum di-set, getSupabase() mengembalikan null
 * dan fitur history otomatis nonaktif — app inti (generate PRD) tetap jalan.
 * Ini bikin project bisa dipakai/deploy tanpa Supabase dulu, lalu diaktifkan
 * kapan pun dengan mengisi env var.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSupabaseEnabled(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled()) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}
