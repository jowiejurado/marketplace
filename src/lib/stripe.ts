import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Payments need the Stripe secret key and the Supabase service-role key. Without them, Buy Now is hidden. */
export const paymentsConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY isn't set (see README → Payments).");
  client ??= new Stripe(key, { appInfo: { name: "Marketplace" } });
  return client;
}

/** The marketplace keeps 10% of each sale; the rest goes to the seller's Stripe account. */
export const PLATFORM_FEE_PERCENT = 10;

/** Stripe's minimum charge in USD. Cheaper (and free) listings can't be bought online. */
export const MIN_CHARGE_CENTS = 50;

export function toCents(dollars: number) {
  return Math.round(dollars * 100);
}

export function platformFee(amountCents: number) {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}
