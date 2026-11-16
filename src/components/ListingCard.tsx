"use client";

import { ArrowPathIcon, CheckIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, ViewTransition, type ReactNode } from "react";
import { formatPrice, type Listing, type View } from "@/lib/shared";
import { seenListings, useMarket, type PendingListing } from "./MarketProvider";
import { TimeAgo, useIsNew } from "./TimeAgo";
import styles from "./ListingCard.module.css";

type Props = {
  listing: Listing;
  layout?: View;
  /** Load the photo straight away (first rows, above the fold). */
  eager?: boolean;
  /** Morph this card's photo into the listing view when it opens. Only feed cards do this. */
  morph?: boolean;
  /** Just published by this visitor: give it a moment of attention. */
  fresh?: boolean;
  /** Swap the open listing instead of stacking history (used inside the listing view). */
  replace?: boolean;
};

export function ListingCard({ listing, layout = "grid", eager = false, morph = false, fresh = false, replace }: Props) {
  const params = useParams<{ id?: string }>();
  const [loaded, setLoaded] = useState(false);
  const isNew = useIsNew(listing.created_at);
  // While this listing is open, its photo belongs to the listing view, so the name moves there.
  const open = params?.id === listing.id;

  const photo = (
    <div className={styles.media} data-loaded={loaded || undefined}>
      {listing.image_url ? (
        <Image
          src={listing.image_url}
          alt=""
          fill
          sizes={layout === "list" ? "(max-width: 640px) 112px, 180px" : "(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 300px"}
          className={styles.image}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <PhotoIcon className={styles.noImage} aria-hidden="true" />
      )}
    </div>
  );

  return (
    <li className={styles.card} data-layout={layout} data-fresh={fresh || undefined}>
      <Link
        href={`/listings/${listing.id}`}
        replace={replace}
        scroll={false}
        className={styles.link}
        onClick={() => seenListings.set(listing.id, listing)}
      >
        <div className={styles.mediaWrap}>
          {morph && !open ? (
            <ViewTransition name={`photo-${listing.id}`} share={{ filter: "none", default: "morph" }} default="none">
              {photo}
            </ViewTransition>
          ) : (
            photo
          )}
          <Badges price={listing.price} isNew={isNew} fresh={fresh} />
        </div>
        <CardBody listing={listing} layout={layout} />
      </Link>
    </li>
  );
}

function Badges({ price, isNew, fresh }: { price: number; isNew: boolean; fresh?: boolean }) {
  if (!fresh && !isNew && price !== 0) return null;
  return (
    <span className={styles.badges}>
      {fresh ? (
        <span className={styles.badge}>Yours</span>
      ) : (
        isNew && <span className={styles.badge}>New</span>
      )}
      {price === 0 && (
        <span className={styles.badge} data-tone="accent">
          Free
        </span>
      )}
    </span>
  );
}

function CardBody({ listing, layout, status }: { listing: Listing; layout: View; status?: ReactNode }) {
  return (
    <div className={styles.body}>
      <p className={styles.category}>{listing.category}</p>
      <h3 className={styles.title}>{listing.title}</h3>
      <p className={styles.meta}>
        {status ?? (
          <>
            <span className={styles.location}>{listing.location}</span>
            <span aria-hidden="true">·</span>
            <TimeAgo iso={listing.created_at} />
          </>
        )}
      </p>
      {layout === "list" && listing.description && <p className={styles.description}>{listing.description}</p>}
      <p className={styles.price}>{formatPrice(listing.price)}</p>
    </div>
  );
}

/** A listing that's still being published. It shows up straight away; the server catches up. */
export function PendingCard({ item, layout = "grid" }: { item: PendingListing; layout?: View }) {
  const { retry, discard } = useMarket();
  const { listing, status } = item;

  const statusLine =
    status === "publishing" ? (
      <span className={styles.statusPublishing}>Publishing…</span>
    ) : status === "live" ? (
      <span className={styles.statusLive}>
        <CheckIcon aria-hidden="true" /> Live
      </span>
    ) : (
      <span className={styles.statusFailed}>{item.error ?? "Didn’t publish"}</span>
    );

  return (
    <li className={styles.card} data-layout={layout} data-pending={status}>
      <div className={styles.link} aria-busy={status === "publishing"}>
        <div className={styles.mediaWrap}>
          <div className={styles.media} data-loaded>
            {listing.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of a photo still uploading
              <img src={listing.image_url} alt="" className={styles.image} />
            )}
          </div>
          {status === "publishing" && <span className={styles.progress} aria-hidden="true" />}
          {status === "failed" && (
            <div className={styles.failedActions}>
              <button type="button" className="btn btn-primary" onClick={() => retry(item.tempId)}>
                <ArrowPathIcon aria-hidden="true" /> Try again
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => discard(item.tempId)} aria-label="Discard listing">
                <TrashIcon aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <CardBody listing={listing} layout={layout} status={statusLine} />
      </div>
    </li>
  );
}

export function CardSkeleton({ layout = "grid" }: { layout?: View }) {
  return (
    <li className={styles.card} data-layout={layout} aria-hidden="true">
      <div className={styles.link}>
        <div className={styles.mediaWrap}>
          <div className={`skeleton ${styles.media}`} />
        </div>
        <div className={styles.body}>
          <span className={`skeleton ${styles.skelPrice}`} />
          <span className={`skeleton ${styles.skelTitle}`} />
          <span className={`skeleton ${styles.skelMeta}`} />
        </div>
      </div>
    </li>
  );
}
