import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { ListingView, ListingViewSkeleton } from "@/components/ListingView";
import { PageTransition } from "@/components/PageTransition";
import { Related } from "@/components/Related";
import { getListing } from "@/lib/listings";
import { formatPrice } from "@/lib/shared";
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

/** The listing's own page, for direct links, refreshes and shares. */
export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          All listings
        </Link>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <ListingViewSkeleton variant="page" />
            </ViewTransition>
          }
        >
          <ListingDetail params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function ListingDetail({ params }: { params: PageProps<"/listings/[id]">["params"] }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <ViewTransition enter="slide-up" default="none">
      <div>
        <ListingView
          listing={listing}
          variant="page"
          related={
            <Suspense>
              <Related listing={listing} variant="page" />
            </Suspense>
          }
        />
      </div>
    </ViewTransition>
  );
}
