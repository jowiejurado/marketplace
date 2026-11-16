import { getListing, getRelated } from "@/lib/listings";
import { categorySlug, type Listing } from "@/lib/shared";
import { CardSkeleton, ListingCard } from "./ListingCard";
import styles from "./Related.module.css";

/** "More in this category", under a listing. */
export async function Related({ listing, variant }: { listing: Listing; variant: "modal" | "page" }) {
  const related = await getRelated(listing);
  if (related.length === 0) return null;

  return (
    <section className={styles.related} data-variant={variant} aria-labelledby={`related-${listing.id}`}>
      <div className={styles.head}>
        <h2 id={`related-${listing.id}`} className={variant === "page" ? `display ${styles.titlePage}` : styles.title}>
          More in {listing.category}
        </h2>
        {/* A real page load, so it also closes the listing when it's open over the feed. */}
        <a href={`/?c=${categorySlug(listing.category)}`}>See all</a>
      </div>
      <ul className={styles.grid}>
        {related.map((item) => (
          <ListingCard key={item.id} listing={item} replace={variant === "modal"} />
        ))}
      </ul>
    </section>
  );
}

/** For the listing modal, which only has the id. */
export async function RelatedById({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  return listing ? <Related listing={listing} variant="modal" /> : null;
}

export function RelatedSkeleton() {
  return (
    <section className={styles.related} data-variant="modal" aria-hidden="true">
      <ul className={styles.grid}>
        {Array.from({ length: 2 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </ul>
    </section>
  );
}
