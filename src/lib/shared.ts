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

export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
}
