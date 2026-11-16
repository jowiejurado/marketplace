import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BulkListingForm } from "@/components/BulkListingForm";
import { CreateListingForm } from "@/components/CreateListingForm";
import { PageTransition } from "@/components/PageTransition";
import { isListingType, LISTING_TYPES } from "@/lib/listingTypes";
import styles from "../page.module.css";

// Unknown types (e.g. /create/boat) fall through to notFound() below.
export function generateStaticParams() {
  return Object.keys(LISTING_TYPES).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: PageProps<"/create/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: isListingType(kind) ? `Sell: ${LISTING_TYPES[kind].title}` : "Create a listing" };
}

export default function CreateListingPage({ params }: PageProps<"/create/[kind]">) {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/create" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          Listing type
        </Link>
        {/* The four types are prerendered, so this boundary only waits for an unknown type. */}
        <Suspense>
          <ListingTypeForm params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function ListingTypeForm({ params }: { params: PageProps<"/create/[kind]">["params"] }) {
  const { kind } = await params;
  if (!isListingType(kind)) notFound();
  const type = LISTING_TYPES[kind];

  return (
    <>
      <header className={styles.intro}>
        <h1 className="display">{type.heading}</h1>
        <p>{type.intro}</p>
      </header>
      {kind === "multiple" ? <BulkListingForm /> : <CreateListingForm kind={kind} />}
    </>
  );
}
