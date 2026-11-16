import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/PageTransition";
import { RefreshWhilePending } from "@/components/RefreshWhilePending";
import { admin } from "@/lib/admin";
import { getListing } from "@/lib/listings";
import { formatCents, type Order } from "@/lib/payments";
import { paymentsConfigured, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Suspense fallback={<div className={`skeleton ${styles.skeleton}`} aria-label="Loading your order" />}>
          <Receipt params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

async function Receipt({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  if (!paymentsConfigured || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Orders aren't public: read with the service role, by an unguessable id, never cached.
  const { data } = await admin().from("orders").select("*").eq("id", id).maybeSingle();
  const order = data as Order | null;
  if (!order) notFound();
  const listing = await getListing(order.listing_id);

  const paid = order.status === "paid";
  const sellerGets = order.amount_total - order.application_fee;

  return (
    <article className={styles.receipt}>
      {!paid && <RefreshWhilePending />}

      <header className={styles.head}>
        {paid ? (
          <CheckCircleIcon className={styles.icon} data-tone="ok" aria-hidden="true" />
        ) : (
          <ClockIcon className={styles.icon} aria-hidden="true" />
        )}
        <h1 className="display">{paid ? "Order confirmed" : "Confirming payment"}</h1>
        <p>
          {paid
            ? "Thanks for your purchase. The seller has been paid and the listing is now marked Sold."
            : "Stripe is confirming your payment. This page updates on its own; it usually takes a few seconds."}
        </p>
      </header>

      <div className={styles.body}>
        {listing && (
          <div className={styles.item}>
            <div className={styles.thumb}>
              {listing.image_url && <Image src={listing.image_url} alt="" fill sizes="120px" className={styles.thumbImg} />}
            </div>
            <div>
              <p className={styles.category}>{listing.category}</p>
              <p className={styles.itemTitle}>{listing.title}</p>
              <p className={styles.muted}>Pick up in {listing.location}</p>
            </div>
          </div>
        )}

        <dl className={styles.lines}>
          <div>
            <dt>Order</dt>
            <dd className={styles.mono}>{order.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{paid ? "Paid" : "Processing"}</dd>
          </div>
          {order.paid_at && (
            <div>
              <dt>Paid</dt>
              <dd>{dateTime.format(new Date(order.paid_at))} UTC</dd>
            </div>
          )}
          {order.buyer_email && (
            <div>
              <dt>Receipt to</dt>
              <dd>{order.buyer_email}</dd>
            </div>
          )}
          <div className={styles.total}>
            <dt>Total</dt>
            <dd>{formatCents(order.amount_total, order.currency)}</dd>
          </div>
        </dl>

        <p className={styles.split}>
          Of this, {formatCents(sellerGets, order.currency)} goes to the seller and{" "}
          {formatCents(order.application_fee, order.currency)} ({PLATFORM_FEE_PERCENT}%) to the marketplace.
        </p>
      </div>

      <div className={styles.actions}>
        {listing && (
          <Link href={`/listings/${listing.id}`} className="btn btn-secondary">
            Message the seller about pickup
          </Link>
        )}
        <Link href="/" className="btn btn-primary" transitionTypes={["nav-back"]}>
          Keep browsing
        </Link>
      </div>
    </article>
  );
}
