"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { buyNow } from "@/app/payments";
import { formatPrice } from "@/lib/shared";
import styles from "./Purchase.module.css";

export function BuyNowButton({ listingId, price }: { listingId: string; price: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const result = await buyNow(listingId);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      // Off to Stripe Checkout. Stay busy: the page is about to change.
      window.location.assign(result.data.url);
    } catch {
      setError("Checkout didn’t open. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.buy} data-buy-now>
      <button type="button" className={`btn btn-primary ${styles.buyButton}`} onClick={handleClick} disabled={busy}>
        {busy ? <span className={styles.spinner} aria-hidden="true" /> : <LockClosedIcon aria-hidden="true" />}
        {busy ? "Opening checkout…" : `Buy now · ${formatPrice(price)}`}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        <p className={styles.note}>Secure checkout by Stripe. Pay by card; the seller is paid directly.</p>
      )}
    </div>
  );
}
