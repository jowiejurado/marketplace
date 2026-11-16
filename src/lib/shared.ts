// Types, constants and formatters used on both the server and in the browser.

export const CATEGORIES = [
  "Vehicles",
  "Property Rentals",
  "Apparel",
  "Classifieds",
  "Electronics",
  "Entertainment",
  "Family",
  "Free Stuff",
  "Garden & Outdoor",
  "Hobbies",
  "Home Goods",
  "Home Improvement",
  "Home Sales",
  "Musical Instruments",
  "Office Supplies",
  "Pet Supplies",
  "Sporting Goods",
  "Toys & Games",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  seller_email: string;
  location: string;
  image_url: string | null;
  created_at: string;
};

export const LIMITS = {
  title: [3, 80],
  description: 2000,
  location: 80,
  message: 1000,
  buyerName: 60,
  price: 10_000_000,
} as const;

export const IMAGE_BUCKET = "listing-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_LOCATION = "Palo Alto, CA";

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/** URL slug for a category, e.g. "Garden & Outdoor" → "garden-outdoor". */
export function categorySlug(category: Category) {
  return category.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function categoryFromSlug(slug: string | undefined): Category | undefined {
  return CATEGORIES.find((c) => categorySlug(c) === slug);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number) {
  return price === 0 ? "Free" : usd.format(price);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

// ---------- Feed filters ----------
// Shared by the server query and the browser, so loaded listings can be filtered
// and sorted instantly while the server fetches the full result.

export const PAGE_SIZE = 12;

export const SORTS = {
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
export type Sort = keyof typeof SORTS;

export const PRICES = {
  any: "Any price",
  free: "Free",
  u50: "Under $50",
  "50-200": "$50 to $200",
  "200p": "Over $200",
} as const;
export type PriceRange = keyof typeof PRICES;

export type View = "grid" | "list";

export type Filters = {
  category?: Category;
  q: string;
  sort: Sort;
  price: PriceRange;
  view: View;
};

export type ListingPage = { items: Listing[]; total: number };

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseFilters(source: ParamSource): Filters {
  const get = (key: string) => {
    const v = source instanceof URLSearchParams ? source.get(key) : source[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const sort = get("sort");
  const price = get("price");
  return {
    category: categoryFromSlug(get("c")),
    q: get("q").trim().slice(0, 80),
    sort: sort in SORTS ? (sort as Sort) : "newest",
    price: price in PRICES ? (price as PriceRange) : "any",
    view: get("view") === "list" ? "list" : "grid",
  };
}

export function filtersToSearch(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("c", categorySlug(filters.category));
  if (filters.q) params.set("q", filters.q);
  if (filters.price !== "any") params.set("price", filters.price);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.view === "list") params.set("view", "list");
  return params.toString();
}

export function filtersHref(filters: Filters) {
  const qs = filtersToSearch(filters);
  return qs ? `/?${qs}` : "/";
}

/** Identifies a result set. View is left out: switching grid/list keeps what's loaded. */
export function feedKey(filters: Filters) {
  return filtersToSearch({ ...filters, view: "grid" }) || "all";
}

export function hasActiveFilters(filters: Filters) {
  return Boolean(filters.category || filters.q || filters.price !== "any");
}

export function inPriceRange(price: number, range: PriceRange) {
  switch (range) {
    case "free":
      return price === 0;
    case "u50":
      return price < 50;
    case "50-200":
      return price >= 50 && price <= 200;
    case "200p":
      return price > 200;
    default:
      return true;
  }
}

/** Same rules as the database query in lib/listings.ts. */
export function matchesFilters(listing: Listing, filters: Filters) {
  if (filters.category && listing.category !== filters.category) return false;
  if (!inPriceRange(listing.price, filters.price)) return false;
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  return [listing.title, listing.description, listing.location].some((field) => field.toLowerCase().includes(q));
}

export function sortListings(listings: Listing[], sort: Sort) {
  const newest = (a: Listing, b: Listing) => b.created_at.localeCompare(a.created_at);
  const sorted = [...listings];
  if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price || newest(a, b));
  else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price || newest(a, b));
  else sorted.sort(newest);
  return sorted;
}

export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
}
