import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { confirmOrder, syncAccount } from "@/lib/payments";
import { paymentsConfigured, stripe } from "@/lib/stripe";

/**
 * Stripe Connect webhook (registered with connect: true, see scripts/create-webhook.mjs).
 * - checkout.session.completed: confirm the order and mark the listing sold
 * - account.updated: keep each seller's onboarding status current
 * The sandbox is shared, so events for orders or accounts we don't know are ignored with a 200.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!paymentsConfigured || !secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // The raw body, exactly as sent, is needed to check the signature.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const order = await confirmOrder(event.data.object);
        if (order) revalidateTag("listings", { expire: 0 });
        break;
      }
      case "account.updated": {
        const seller = await syncAccount(event.data.object);
        if (seller) revalidateTag("sellers", { expire: 0 });
        break;
      }
    }
  } catch (error) {
    // Our side failed (e.g. Supabase): a 500 makes Stripe retry later.
    console.error("stripe webhook", event.type, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
