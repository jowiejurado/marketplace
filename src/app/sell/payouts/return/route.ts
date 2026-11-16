import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/admin";
import { syncAccount } from "@/lib/payments";
import { paymentsConfigured, stripe } from "@/lib/stripe";

/** Stripe sends sellers here after onboarding. Save their status, then show it on /sell/payouts. */
export async function GET(request: NextRequest) {
  const to = (query: string) => NextResponse.redirect(new URL(`/sell/payouts?${query}`, request.url));
  const account = request.nextUrl.searchParams.get("account") ?? "";
  if (!paymentsConfigured || !/^acct_[A-Za-z0-9]+$/.test(account)) return to("status=unknown");

  const { data: known } = await admin().from("sellers").select("email").eq("stripe_account_id", account).maybeSingle();
  if (!known) return to("status=unknown");

  try {
    const seller = await syncAccount(await stripe().accounts.retrieve(account));
    revalidateTag("sellers", { expire: 0 });
    return to(seller?.charges_enabled ? "status=ready" : `status=incomplete&account=${account}`);
  } catch (error) {
    console.error("payouts/return", error);
    return to(`status=incomplete&account=${account}`);
  }
}
