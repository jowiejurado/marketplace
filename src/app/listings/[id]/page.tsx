import { ChevronRightIcon, ClockIcon, MapPinIcon, PhotoIcon, TagIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyEmail } from "@/components/CopyEmail";
import { CreatedBanner } from "@/components/CreatedBanner";
import { ListingCard } from "@/components/ListingCard";
import { MessageSeller } from "@/components/MessageSeller";
import { getListing, getRelated } from "@/lib/listings";
import { TimeAgo } from "@/components/TimeAgo";
import { categorySlug, formatPrice } from "@/lib/shared";
import styles from "./page.module.css";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing not found" };
  return {
    title: `${listing.title} · ${formatPrice(listing.price)}`,
    description: listing.description.slice(0, 160) || `${listing.title} in ${listing.location}`,
    openGraph: { images: listing.image_url ? [listing.image_url] : [] },
  };
}

export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <main id="main" className={styles.page}>
      <Suspense fallback={<DetailSkeleton />}>
        <ListingDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ListingDetail({ params }: { params: PageProps<"/listings/[id]">["params"] }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const related = await getRelated(listing);
  const sellerName = listing.seller_email.split("@")[0];

  return (
    <>
      <Suspense>
        <CreatedBanner />
      </Suspense>

      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/">Marketplace</Link>
        <ChevronRightIcon aria-hidden="true" />
        <Link href={`/?c=${categorySlug(listing.category)}`}>{listing.category}</Link>
        <ChevronRightIcon aria-hidden="true" />
        <span aria-current="page">{listing.title}</span>
      </nav>

      <article className={styles.layout}>
        <div className={styles.gallery}>
          {listing.image_url ? (
            <>
              {/* Blurred copy fills the frame behind photos that aren't square. */}
              <Image src={listing.image_url} alt="" fill sizes="60vw" className={styles.backdrop} aria-hidden="true" />
              <Image
                src={listing.image_url}
                alt={listing.title}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                className={styles.photo}
                preload
              />
            </>
          ) : (
            <PhotoIcon className={styles.noPhoto} aria-hidden="true" />
          )}
        </div>

        <aside className={styles.panel}>
          <section className={styles.card}>
            <h1 className={styles.title}>{listing.title}</h1>
            <p className={styles.price}>{formatPrice(listing.price)}</p>
            <ul className={styles.facts}>
              <li>
                <ClockIcon aria-hidden="true" />
                <span>
                  Listed <TimeAgo iso={listing.created_at} />
                </span>
              </li>
              <li>
                <MapPinIcon aria-hidden="true" />
                <span>{listing.location}</span>
              </li>
              <li>
                <TagIcon aria-hidden="true" />
                <Link href={`/?c=${categorySlug(listing.category)}`}>{listing.category}</Link>
              </li>
            </ul>

            <h2 className={styles.sectionTitle}>Details</h2>
            {listing.description ? (
              <p className={styles.description}>{listing.description}</p>
            ) : (
              <p className={styles.muted}>The seller didn’t add a description.</p>
            )}

            <h2 className={styles.sectionTitle}>Seller information</h2>
            <div className={styles.seller}>
              <span className={styles.sellerAvatar} aria-hidden="true">
                {sellerName.slice(0, 1).toUpperCase()}
              </span>
              <div className={styles.sellerText}>
                <p className={styles.sellerName}>{sellerName}</p>
                <CopyEmail email={listing.seller_email} />
              </div>
            </div>
          </section>

          <MessageSeller listingId={listing.id} listingTitle={listing.title} />
        </aside>
      </article>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-heading">
          <div className={styles.relatedHead}>
            <h2 id="related-heading">More in {listing.category}</h2>
            <Link href={`/?c=${categorySlug(listing.category)}`}>See all</Link>
          </div>
          <ul className={styles.relatedGrid}>
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading listing">
      <div className={`skeleton ${styles.gallery}`} />
      <div className={styles.panel}>
        <div className={styles.card}>
          <div className={`skeleton ${styles.skelTitle}`} />
          <div className={`skeleton ${styles.skelPrice}`} />
          <div className={`skeleton ${styles.skelLine}`} />
          <div className={`skeleton ${styles.skelLine}`} />
        </div>
      </div>
    </div>
  );
}
