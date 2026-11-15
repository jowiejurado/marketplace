import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Category, Listing } from "./shared";
import { db } from "./supabase";

const COLUMNS = "id, title, description, price, category, seller_email, location, image_url, created_at";

// Reads are cached and tagged "listings". Creating a listing calls updateTag("listings")
// so the new item shows up straight away (see app/actions.ts).

/** Lets a search term go into a PostgREST `or` filter without breaking its syntax. */
function escapeSearch(term: string) {
  return term.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ");
}

// numeric comes back from PostgREST as a string or number depending on size.
function normalise(row: Listing): Listing {
  return { ...row, price: Number(row.price) };
}

export async function getListings({ category, q }: { category?: Category; q?: string } = {}): Promise<Listing[]> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");

  let query = db().from("listings").select(COLUMNS).order("created_at", { ascending: false }).limit(120);

  if (category) query = query.eq("category", category);
  const term = q?.trim();
  if (term) {
    const pattern = `%${escapeSearch(term)}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalise);
}

export async function getListing(id: string): Promise<Listing | null> {
  "use cache";
  cacheTag("listings");
  cacheLife("hours");

  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("listings").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalise(data) : null;
}

export async function getRelated(listing: Listing): Promise<Listing[]> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");

  const { data } = await db()
    .from("listings")
    .select(COLUMNS)
    .eq("category", listing.category)
    .neq("id", listing.id)
    .order("created_at", { ascending: false })
    .limit(4);
  return (data ?? []).map(normalise);
}

/** Listing counts per category, for the sidebar. */
export async function getCategoryCounts(): Promise<Partial<Record<Category, number>>> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");

  const { data } = await db().from("listings").select("category").limit(5000);
  const counts: Partial<Record<Category, number>> = {};
  for (const row of data ?? []) counts[row.category as Category] = (counts[row.category as Category] ?? 0) + 1;
  return counts;
}
