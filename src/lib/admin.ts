import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

/**
 * The service-role client. It bypasses Row Level Security, so it only ever runs on the
 * server, and only for what visitors must not do themselves: saving sellers' Stripe
 * accounts, recording orders and marking listings sold.
 */
export function admin(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set (see README → Payments).");
  client ??= createClient(url, serviceKey, { auth: { persistSession: false } });
  return client;
}
