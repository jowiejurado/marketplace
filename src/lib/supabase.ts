import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/** One anon client. There's no login, so the same client works on the server and in the browser. */
export function db(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase isn't configured. Add the keys to .env.local (see README).");
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}
