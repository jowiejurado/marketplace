import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/admin";
import { paymentsConfigured, stripe } from "@/lib/stripe";

/**
 * Stripe Checkout's cancel_url. The buyer backed out, so close their session at Stripe
 * and release the item straight away instead of holding it until the session expires.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order") ?? "";
  if (!paymentsConfigured || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const db = admin();
  const { data: order } = await db
    .from("orders")
    .select("id, listing_id, status, stripe_session_id, stripe_account_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.redirect(new URL("/", request.url));

  if (order.status === "pending") {
    if (order.stripe_session_id) {
      try {
        // Expiring it means the old Checkout page can't be paid any more.
        await stripe().checkout.sessions.expire(order.stripe_session_id, {}, { stripeAccount: order.stripe_account_id });
      } catch (error) {
        // Already completed or expired at Stripe: only release the hold if it wasn't paid.
        const session = await stripe()
          .checkout.sessions.retrieve(order.stripe_session_id, {}, { stripeAccount: order.stripe_account_id })
          .catch(() => null);
        if (session?.payment_status === "paid") {
          return NextResponse.redirect(new URL(`/orders/confirm?session_id=${session.id}`, request.url));
        }
        console.error("orders/cancel expire", error);
      }
    }
    await db.from("orders").update({ status: "canceled" }).eq("id", order.id).eq("status", "pending");
  }

  return NextResponse.redirect(new URL(`/listings/${order.listing_id}`, request.url));
}
