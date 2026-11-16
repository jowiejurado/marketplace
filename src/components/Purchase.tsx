import Link from "next/link";
import { getListing } from "@/lib/listings";
import { canBuy, getSeller } from "@/lib/payments";
import type { Listing } from "@/lib/shared";
import { paymentsConfigured } from "@/lib/stripe";
import { BuyNowButton } from "./BuyNowButton";
import styles from "./Purchase.module.css";

/**
 * Buy Now for listings whose seller has connected Stripe; a Sold notice once it's paid for;
 * otherwise a nudge for the seller to connect. Streamed in, so the listing never waits on it.
 */
export async function Purchase({ listing }: { listing: Listing }) {
  if (listing.status === "sold") {
    return (
      <div className={styles.sold} role="status">
        <span className={styles.soldTag}>Sold</span>
        <p>This item has been bought. Message the seller in case they have something similar.</p>
      </div>
    );
  }

  if (!paymentsConfigured) return null;

  const seller = await getSeller(listing.seller_email);
  if (canBuy(listing, seller)) return <BuyNowButton listingId={listing.id} price={listing.price} />;

  if (listing.price > 0 && !seller?.charges_enabled) {
    return (
      <p className={styles.nudge}>
        Is this yours? <Link href="/sell/payouts">Connect Stripe</Link> so buyers can pay online.
      </p>
    );
  }
  return null;
}

/** For the listing modal, which only has the id. Reads the listing fresh so Sold is current. */
export async function PurchaseById({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  return listing ? <Purchase listing={listing} /> : null;
}
