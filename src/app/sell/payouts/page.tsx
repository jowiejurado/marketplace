import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConnectStripeForm } from "@/components/ConnectStripeForm";
import { PageTransition } from "@/components/PageTransition";
import { paymentsConfigured, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Get paid with Stripe",
};

export default function PayoutsPage({ searchParams }: PageProps<"/sell/payouts">) {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          All listings
        </Link>

        <header className={styles.intro}>
          <h1 className="display">Get paid with Stripe</h1>
          <p>
            Connect a Stripe account once. Every listing with your email then gets a Buy Now button, buyers pay by card,
            and the money goes to your account, minus a {PLATFORM_FEE_PERCENT}% marketplace fee.
          </p>
        </header>

        <Suspense>
          <OnboardingStatus searchParams={searchParams} />
        </Suspense>

        <div className={styles.layout}>
          <section className={styles.card} aria-labelledby="connect-heading">
            <h2 id="connect-heading" className={styles.cardTitle}>
              Connect your account
            </h2>
            {!paymentsConfigured && (
              <p className={styles.notice} role="status">
                Online payments aren’t set up on this site yet. Add the Stripe and Supabase service keys (see README).
              </p>
            )}
            <ConnectStripeForm disabled={!paymentsConfigured} />
            <p className={styles.small}>
              This marketplace runs in Stripe’s test mode, so no real money moves. Stripe’s onboarding accepts its{" "}
              <a href="https://docs.stripe.com/connect/testing" target="_blank" rel="noreferrer">
                test details
              </a>
              .
            </p>
          </section>

          <section className={styles.steps} aria-labelledby="how-heading">
            <h2 id="how-heading" className={styles.cardTitle}>
              How it works
            </h2>
            <ol>
              <li>
                <strong>Connect.</strong> Enter the email on your listings and finish Stripe’s short sign-up. Stripe
                checks your identity and bank details, not us.
              </li>
              <li>
                <strong>Buyers pay.</strong> Your listings show Buy Now. Checkout is Stripe’s own secure page.
              </li>
              <li>
                <strong>You get paid.</strong> The sale goes to your Stripe account, less the {PLATFORM_FEE_PERCENT}% fee,
                and the listing is marked Sold.
              </li>
            </ol>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}

async function OnboardingStatus({ searchParams }: { searchParams: PageProps<"/sell/payouts">["searchParams"] }) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const account = typeof params.account === "string" && /^acct_[A-Za-z0-9]+$/.test(params.account) ? params.account : "";

  if (status === "ready") {
    return (
      <div className={styles.banner} data-tone="ok" role="status">
        <CheckCircleIcon aria-hidden="true" />
        <div>
          <p className={styles.bannerTitle}>You’re ready to get paid</p>
          <p>Your listings now show a Buy Now button. Buyers pay by card and the money goes to your Stripe account.</p>
        </div>
        <Link href="/" className="btn btn-secondary" transitionTypes={["nav-back"]}>
          See listings
        </Link>
      </div>
    );
  }

  if (status === "incomplete") {
    return (
      <div className={styles.banner} data-tone="warn" role="status">
        <ExclamationTriangleIcon aria-hidden="true" />
        <div>
          <p className={styles.bannerTitle}>Stripe still needs a few details</p>
          <p>Buy Now appears on your listings once Stripe has everything it needs.</p>
        </div>
        {account && (
          // A plain link: it goes through our refresh route and on to Stripe.
          <a href={`/sell/payouts/refresh?account=${account}`} className="btn btn-primary">
            Continue with Stripe
          </a>
        )}
      </div>
    );
  }

  if (status === "unknown") {
    return (
      <div className={styles.banner} data-tone="warn" role="status">
        <ExclamationTriangleIcon aria-hidden="true" />
        <div>
          <p className={styles.bannerTitle}>We couldn’t match that Stripe account</p>
          <p>Enter your email below to connect again.</p>
        </div>
      </div>
    );
  }

  return null;
}
