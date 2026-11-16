"use server";

import { headers } from "next/headers";
import { admin } from "@/lib/admin";
import { getListing } from "@/lib/listings";
import { canBuy, onboardingLink, type Seller } from "@/lib/payments";
import { isEmail } from "@/lib/shared";
import { paymentsConfigured, platformFee, stripe, toCents } from "@/lib/stripe";
import type { ActionResult } from "./actions";

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

const NOT_SET_UP = "Online payments aren’t set up on this site yet.";

/** Finds the seller's connected account, or creates one the first time they connect. */
async function sellerAccount(email: string): Promise<Seller> {
  const db = admin();
  const { data: existing, error } = await db
    .from("sellers")
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  // A Stripe-hosted (Express) account. Payments are direct charges on this account,
  // with the marketplace taking an application fee.
  const account = await stripe().accounts.create({
    email,
    country: "US",
    business_type: "individual",
    controller: {
      stripe_dashboard: { type: "express" },
      fees: { payer: "application" },
      losses: { payments: "application" },
      requirement_collection: "stripe",
    },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { product_description: "Second-hand items sold on Marketplace" },
    metadata: { marketplace_email: email },
  });

  const { data: created, error: insertError } = await db
    .from("sellers")
    .insert({ email, stripe_account_id: account.id })
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .single();

  if (insertError) {
    // Someone connected the same email a moment ago: use theirs, drop ours.
    const { data: winner } = await db
      .from("sellers")
      .select("email, stripe_account_id, charges_enabled, details_submitted")
      .eq("email", email)
      .maybeSingle();
    if (!winner) throw insertError;
    await stripe().accounts.del(account.id).catch(() => {});
    return winner;
  }
  return created;
}

export async function connectWithStripe(
  form: FormData,
): Promise<ActionResult<{ url: string } | { ready: true; email: string }>> {
  if (String(form.get("website") ?? "") !== "") return { ok: false, error: "Something went wrong. Please try again." };
  if (!paymentsConfigured) return { ok: false, error: NOT_SET_UP };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) {
    return { ok: false, error: "Check the email.", fields: { email: "Use the email on your listings." } };
  }

  try {
    const seller = await sellerAccount(email);
    if (seller.charges_enabled) return { ok: true, data: { ready: true, email } };
    return { ok: true, data: { url: await onboardingLink(seller.stripe_account_id, await origin()) } };
  } catch (error) {
    console.error("connectWithStripe", error);
    return { ok: false, error: "Stripe didn’t respond. Please try again in a moment." };
  }
}

/** "Buy now": opens Stripe Checkout for this listing, paid straight to the seller's account. */
export async function buyNow(listingId: string): Promise<ActionResult<{ url: string }>> {
  if (!paymentsConfigured) return { ok: false, error: NOT_SET_UP };

  const listing = await getListing(listingId);
  if (!listing) return { ok: false, error: "This listing is no longer available." };

  // Read the seller fresh (not cached): they may have finished onboarding a moment ago.
  const { data: seller } = await admin()
    .from("sellers")
    .select("email, stripe_account_id, charges_enabled, details_submitted")
    .eq("email", listing.seller_email.toLowerCase())
    .maybeSingle();

  if (listing.status === "sold") return { ok: false, error: "Sorry, this has just sold." };
  if (!canBuy(listing, seller)) return { ok: false, error: "This listing can’t be bought online. Message the seller instead." };

  const amount = toCents(listing.price);
  const fee = platformFee(amount);
  const base = await origin();

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: listing.title,
                description: listing.description.slice(0, 200) || undefined,
                images: listing.image_url ? [listing.image_url] : undefined,
              },
            },
          },
        ],
        // Direct charge: the payment lives on the seller's account; the marketplace keeps the fee.
        payment_intent_data: { application_fee_amount: fee, metadata: { listing_id: listing.id } },
        metadata: { listing_id: listing.id },
        success_url: `${base}/orders/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/listings/${listing.id}`,
      },
      { stripeAccount: seller!.stripe_account_id },
    );

    const { error } = await admin().from("orders").insert({
      listing_id: listing.id,
      seller_email: listing.seller_email.toLowerCase(),
      stripe_account_id: seller!.stripe_account_id,
      stripe_session_id: session.id,
      amount_total: amount,
      application_fee: fee,
      currency: "usd",
    });
    if (error) throw error;

    return { ok: true, data: { url: session.url! } };
  } catch (error) {
    console.error("buyNow", error);
    return { ok: false, error: "Checkout didn’t open. Please try again." };
  }
}
