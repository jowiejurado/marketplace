import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { confirmOrder, getOrderBySession } from "@/lib/payments";
import { paymentsConfigured, stripe } from "@/lib/stripe";

/**
 * Stripe Checkout's success_url. The webhook is the source of truth, but it can arrive after
 * the buyer does, so check the session here too (confirmOrder is safe to run twice), then
 * show the order.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  const home = NextResponse.redirect(new URL("/", request.url));
  if (!paymentsConfigured || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return home;

  const order = await getOrderBySession(sessionId);
  if (!order) return home;

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: order.stripe_account_id });
    if (await confirmOrder(session)) revalidateTag("listings", { expire: 0 });
  } catch (error) {
    // Not fatal: the order page says "processing" and the webhook will finish the job.
    console.error("orders/confirm", error);
  }

  return NextResponse.redirect(new URL(`/orders/${order.id}`, request.url));
}
