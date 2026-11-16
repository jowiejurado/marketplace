import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PAGE_SIZE, type Category, type Filters, type Listing, type ListingPage } from "./shared";
import { db } from "./supabase";

// "*" rather than a column list so the app keeps working before setup.sql adds the payment columns.
const COLUMNS = "*";

// Reads are cached and tagged "listings". Creating a listing calls updateTag("listings")
// so the new item shows up straight away (see app/actions.ts).

/** Lets a search term go into a PostgREST `or` filter without breaking its syntax. */
function escapeSearch(term: string) {
  return term.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ");
}

// numeric comes back from PostgREST as a string or number depending on size.
function normalise(row: Listing): Listing {
  return { ...row, price: Number(row.price), status: row.status === "sold" ? "sold" : "available" };
}

type ListingQuery = Pick<Filters, "category" | "q" | "sort" | "price"> & { offset?: number };

/** One page of the feed, plus how many listings match in total. Same rules as matchesFilters() in shared.ts. */
export async function getListings({ category, q, sort, price, offset = 0 }: ListingQuery): Promise<ListingPage> {
  "use cache";
  cacheTag("listings");
  cacheLife("minutes");

  let query = db().from("listings").select(COLUMNS, { count: "exact" });

  if (category) query = query.eq("category", category);

  if (price === "free") query = query.eq("price", 0);
  else if (price === "u50") query = query.lt("price", 50);
  else if (price === "50-200") query = query.gte("price", 50).lte("price", 200);
  else if (price === "200p") query = query.gt("price", 200);

  const term = q.trim();
  if (term) {
    const pattern = `%${escapeSearch(term)}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`);
  }

  if (sort === "price-asc") query = query.order("price", { ascending: true });
  if (sort === "price-desc") query = query.order("price", { ascending: false });
  query = query.order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []).map(normalise), total: count ?? data?.length ?? 0 };
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
