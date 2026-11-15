import { MapPinIcon, PhotoIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Listing } from "@/lib/shared";
import styles from "./ListingCard.module.css";
import { TimeAgo } from "./TimeAgo";

type Props = {
  listing: Listing;
  layout?: "grid" | "list";
  /** Load the image straight away (first row above the fold). */
  eager?: boolean;
};

export function ListingCard({ listing, layout = "grid", eager = false }: Props) {
  return (
    <li className={styles.card} data-layout={layout}>
      <Link href={`/listings/${listing.id}`} className={styles.link}>
        <div className={styles.media}>
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt=""
              fill
              sizes={layout === "list" ? "160px" : "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 260px"}
              className={styles.image}
              loading={eager ? "eager" : "lazy"}
            />
          ) : (
            <PhotoIcon className={styles.noImage} aria-hidden="true" />
          )}
          {listing.price === 0 && <span className={styles.freeTag}>Free</span>}
        </div>

        <div className={styles.body}>
          <p className={styles.price}>{formatPrice(listing.price)}</p>
          <h3 className={styles.title}>{listing.title}</h3>
          <p className={styles.meta}>
            <MapPinIcon aria-hidden="true" />
            <span>{listing.location}</span>
          </p>
          {layout === "list" && (
            <>
              {listing.description && <p className={styles.description}>{listing.description}</p>}
              <p className={styles.when}>
                {listing.category} · Listed <TimeAgo iso={listing.created_at} />
              </p>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
