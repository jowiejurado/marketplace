import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/admin";
import { onboardingLink } from "@/lib/payments";
import { paymentsConfigured } from "@/lib/stripe";

/**
 * Onboarding links are single-use and expire. Stripe sends sellers here when theirs has,
 * and the "Continue onboarding" button uses it too: make a fresh link and go straight back.
 */
export async function GET(request: NextRequest) {
  const home = NextResponse.redirect(new URL("/sell/payouts", request.url));
  const account = request.nextUrl.searchParams.get("account") ?? "";
  if (!paymentsConfigured || !/^acct_[A-Za-z0-9]+$/.test(account)) return home;

  // Only accounts this marketplace created, and only while onboarding isn't finished.
  const { data: seller } = await admin()
    .from("sellers")
    .select("charges_enabled")
    .eq("stripe_account_id", account)
    .maybeSingle();
  if (!seller || seller.charges_enabled) return home;

  try {
    return NextResponse.redirect(await onboardingLink(account, request.nextUrl.origin));
  } catch (error) {
    console.error("payouts/refresh", error);
    return home;
  }
}
