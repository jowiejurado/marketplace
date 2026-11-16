import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type Stripe from "stripe";
import { admin } from "./admin";
import { MIN_CHARGE_CENTS, paymentsConfigured, stripe, toCents } from "./stripe";
import type { Listing } from "./shared";

export type Seller = {
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
};

export type Order = {
  id: string;
  listing_id: string;
  seller_email: string;
  stripe_account_id: string;
  stripe_session_id: string | null;
  amount_total: number;
  application_fee: number;
  currency: string;
  buyer_email: string | null;
  status: "pending" | "paid" | "expired" | "canceled";
  created_at: string;
  paid_at: string | null;
};

// Seller reads are cached and tagged "sellers"; onboarding and the account.updated webhook refresh them.

export async function getSeller(email: string): Promise<Seller | null> {
  "use cache";
  cacheTag("sellers");
  cacheLife("minutes");

  if (!paymentsConfigured) return null;
  const { data, error } = await admin()
    .from("sellers")
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) return null; // Payment tables not set up yet: treat as "not onboarded".
  return data;
}

/** Can a buyer pay for this listing online right now? */
export function canBuy(listing: Listing, seller: Seller | null) {
  return (
    listing.status === "available" &&
    Boolean(seller?.charges_enabled) &&
    toCents(listing.price) >= MIN_CHARGE_CENTS
  );
}

/** Copies the latest onboarding state from Stripe into Supabase. Returns null for accounts we don't know. */
export async function syncAccount(account: Stripe.Account): Promise<Seller | null> {
  const { data, error } = await admin()
    .from("sellers")
    .update({
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id)
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Marks an order paid and its listing sold. Safe to call more than once: the webhook
 * and the success page both call it, whichever sees the payment first wins.
 */
export async function confirmOrder(session: Stripe.Checkout.Session): Promise<Order | null> {
  if (session.payment_status !== "paid") return null;

  const paid = {
    status: "paid",
    paid_at: new Date().toISOString(),
    buyer_email: session.customer_details?.email ?? null,
    stripe_session_id: session.id,
  };
  // "expired" too: a payment that lands right as our hold runs out still counts.
  const open = ["pending", "expired"];

  // Find the order by session id, or by client_reference_id (our order id) if saving the session id failed.
  let { data: order, error } = await admin()
    .from("orders")
    .update(paid)
    .eq("stripe_session_id", session.id)
    .in("status", open)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  const ref = session.client_reference_id;
  if (!order && ref && /^[0-9a-f-]{36}$/i.test(ref)) {
    ({ data: order, error } = await admin()
      .from("orders")
      .update(paid)
      .eq("id", ref)
      .is("stripe_session_id", null)
      .in("status", open)
      .select("*")
      .maybeSingle());
    if (error) throw error;
  }

  // Already confirmed earlier (webhook and success page both call this)? Use that.
  const existing = order ? null : await getOrderBySession(session.id);
  const confirmed = order ?? (existing?.status === "paid" ? existing : null);
  if (!confirmed) return null; // Not one of ours (the sandbox is shared), or not paid.

  const { error: soldError } = await admin()
    .from("listings")
    .update({ status: "sold", sold_at: confirmed.paid_at ?? new Date().toISOString() })
    .eq("id", confirmed.listing_id)
    .eq("status", "available");
  if (soldError) throw soldError;

  return confirmed;
}

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  const { data, error } = await admin().from("orders").select("*").eq("stripe_session_id", sessionId).maybeSingle();
  if (error) throw error;
  return data;
}

export function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/** A one-time link to Stripe's hosted onboarding. Stripe sends the seller back to `return_url` when done. */
export async function onboardingLink(accountId: string, base: string) {
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${base}/sell/payouts/refresh?account=${accountId}`,
        return_url: `${base}/sell/payouts/return?account=${accountId}`,
      },
    },
  });
  return link.url;
}
