import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CreateListingForm } from "@/components/CreateListingForm";
import { PageTransition } from "@/components/PageTransition";
import { isAvailableType, LISTING_TYPES } from "@/lib/listingTypes";
import styles from "../page.module.css";

// Only types with a form get a page; coming-soon ones (and anything else) are a 404.
export function generateStaticParams() {
  return Object.entries(LISTING_TYPES)
    .filter(([, type]) => type.available)
    .map(([kind]) => ({ kind }));
}

export async function generateMetadata({ params }: PageProps<"/create/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: isAvailableType(kind) ? `Sell: ${LISTING_TYPES[kind].title}` : "Create a listing" };
}

export default function CreateListingPage({ params }: PageProps<"/create/[kind]">) {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/create" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          Listing type
        </Link>
        {/* Available types are prerendered, so this boundary only waits for an unknown one. */}
        <Suspense>
          <ListingTypeForm params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function ListingTypeForm({ params }: { params: PageProps<"/create/[kind]">["params"] }) {
  const { kind } = await params;
  if (!isAvailableType(kind)) notFound();
  const type = LISTING_TYPES[kind];

  return (
    <>
      <header className={styles.intro}>
        <h1 className="display">{type.title}</h1>
        <p>{type.intro}</p>
      </header>
      <CreateListingForm />
    </>
  );
}
